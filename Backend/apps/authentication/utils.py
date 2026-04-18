"""
Utility functions for authentication
"""
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone
from twilio.rest import Client
from .models import OTPVerification, OTPResendLog
from apps.accounts.models import User
import logging
import traceback

logger = logging.getLogger(__name__)


class TwilioService:
    """Service for sending SMS via Twilio (used by phone-based OTP flows)"""

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.client = None

        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, to_number, message):
        """Send SMS message"""
        if not self.client:
            logger.warning("Twilio client not initialized. Check credentials.")
            return False

        try:
            msg = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_number
            )
            logger.info(f"SMS sent successfully: {msg.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False

    def send_otp(self, to_number, otp_code):
        """Send OTP via SMS"""
        message = (
            f"Your Aoqolt verification code is: {otp_code}. "
            f"Valid for 5 minutes. Do not share this code."
        )
        return self.send_sms(to_number, message)


class OTPService:
    """Service for OTP management"""

    # ── Phone-based OTP (update-phone, forgot-password flows) ────────────────

    @staticmethod
    def create_otp(user, phone_number):
        """Create and send OTP via SMS (phone-based flows only)."""
        otp_code = OTPVerification.generate_otp()

        otp = OTPVerification.objects.create(
            user=user,
            phone_number=phone_number,
            otp_code=otp_code
        )

        twilio_service = TwilioService()
        full_number = f"{user.country_code}{phone_number}"
        success = twilio_service.send_otp(full_number, otp_code)

        if not success:
            logger.warning(f"OTP generated but not sent via SMS to {full_number}")
            if settings.DEBUG:
                return otp, otp_code

        return otp, None

    @staticmethod
    def verify_otp(user, phone_number, otp_code):
        """Verify phone-based OTP (used by update-phone and forgot-password flows)."""
        try:
            otp = OTPVerification.objects.filter(
                user=user,
                phone_number=phone_number,
                otp_code=otp_code,
                is_verified=False
            ).latest('created_at')

            if otp.is_expired():
                return False, "OTP has expired. Please request a new one."

            if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
                return False, "Maximum verification attempts exceeded. Please request a new OTP."

            otp.attempts += 1
            otp.save()

            if otp.otp_code == otp_code:
                otp.is_verified = True
                otp.verified_at = timezone.now()
                otp.save()

                user.is_verified = True
                user.is_active = True
                user.requires_phone_verification = False
                user.save()

                return True, "Phone number verified successfully"
            else:
                return False, "Invalid OTP code"

        except OTPVerification.DoesNotExist:
            return False, "Invalid OTP or OTP not found"

    # ── Email-based OTP (manual signup flow) ─────────────────────────────────

    @staticmethod
    def create_email_otp(user):
        """
        Generate an OTP and send it to the user's email address.
        Used exclusively for manual signup verification.
        Returns (otp_record, raw_otp_code_or_None).
        raw_otp_code is returned only in DEBUG mode.
        """
        otp_code = OTPVerification.generate_otp()

        otp = OTPVerification.objects.create(
            user=user,
            email=user.email,
            otp_code=otp_code
        )

        subject = 'Your Aoqolt Verification Code'
        body = (
            f"Hello {user.full_name},\n\n"
            f"Your Aoqolt sign-up verification code is:\n\n"
            f"  {otp_code}\n\n"
            f"This code is valid for 5 minutes. Do not share it with anyone.\n\n"
            f"If you did not create an account, you can safely ignore this email.\n\n"
            f"– The Aoqolt Team"
        )

        try:
            logger.debug(
                f"[create_email_otp] Sending OTP to {user.email} — "
                f"BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, "
                f"PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, "
                f"USER={settings.EMAIL_HOST_USER!r}, "
                f"PASSWORD_SET={'yes' if settings.EMAIL_HOST_PASSWORD else 'NO - EMPTY'}"
            )
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.EMAIL_HOST_USER or 'noreply@aoqolt.com',
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"[create_email_otp] OTP email sent to {user.email}")
        except Exception as exc:
            logger.error(
                f"[create_email_otp] Failed to send OTP email to {user.email}: {exc}\n"
                f"{traceback.format_exc()}"
            )
            if settings.DEBUG:
                return otp, otp_code

        if settings.DEBUG:
            return otp, otp_code

        return otp, None

    @staticmethod
    def verify_email_otp(user, otp_code):
        """
        Verify an email-based OTP for manual signup.
        On success, activates and verifies the user account.
        """
        try:
            otp = OTPVerification.objects.filter(
                user=user,
                email=user.email,
                is_verified=False
            ).latest('created_at')

            if otp.is_expired():
                return False, "OTP has expired. Please request a new one."

            if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
                return False, "Maximum verification attempts exceeded. Please request a new OTP."

            otp.attempts += 1
            otp.save()

            if otp.otp_code == otp_code:
                otp.is_verified = True
                otp.verified_at = timezone.now()
                otp.save()

                user.is_verified = True
                user.is_active = True
                user.requires_phone_verification = False
                user.save()

                return True, "Email verified successfully"
            else:
                return False, "Invalid OTP code"

        except OTPVerification.DoesNotExist:
            return False, "Invalid OTP or OTP not found"

    # ── Rate-limiting helpers (shared) ────────────────────────────────────────

    @staticmethod
    def can_resend_otp(user):
        """Check if user can resend OTP (rate limiting)."""
        cache_key = f"otp_resend_{user.id}"
        if cache.get(cache_key):
            return False, "Please wait before requesting another OTP"
        return True, None

    @staticmethod
    def mark_otp_resent(user):
        """Mark that OTP was resent (for rate limiting)."""
        cache_key = f"otp_resend_{user.id}"
        cache.set(cache_key, True, settings.OTP_RESEND_COOLDOWN_SECONDS)

