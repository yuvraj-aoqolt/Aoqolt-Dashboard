"""
Utility functions for authentication
"""
from django.conf import settings
from django.core.cache import cache
from twilio.rest import Client
from .models import OTPVerification, OTPResendLog
from apps.accounts.models import User
import logging

logger = logging.getLogger(__name__)


class TwilioService:
    """Service for sending SMS via Twilio"""
    
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
            message = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_number
            )
            logger.info(f"SMS sent successfully: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False
    
    def send_otp(self, to_number, otp_code):
        """Send OTP via SMS"""
        message = f"Your Aoqolt verification code is: {otp_code}. Valid for 5 minutes. Do not share this code."
        return self.send_sms(to_number, message)


class OTPService:
    """Service for OTP management"""
    
    @staticmethod
    def create_otp(user, phone_number):
        """Create and send OTP"""
        # Generate OTP
        otp_code = OTPVerification.generate_otp()
        
        # Create OTP record
        otp = OTPVerification.objects.create(
            user=user,
            phone_number=phone_number,
            otp_code=otp_code
        )
        
        # Send OTP via Twilio
        twilio_service = TwilioService()
        full_number = f"{user.country_code}{phone_number}"
        
        success = twilio_service.send_otp(full_number, otp_code)
        
        if not success:
            logger.warning(f"OTP generated but not sent via SMS: {otp_code}")
            # In development, you might want to return the OTP
            if settings.DEBUG:
                return otp, otp_code
        
        return otp, None
    
    @staticmethod
    def verify_otp(user, phone_number, otp_code):
        """Verify OTP code"""
        try:
            otp = OTPVerification.objects.filter(
                user=user,
                phone_number=phone_number,
                otp_code=otp_code,
                is_verified=False
            ).latest('created_at')
            
            # Check if expired
            if otp.is_expired():
                return False, "OTP has expired. Please request a new one."
            
            # Check attempts
            if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
                return False, "Maximum verification attempts exceeded. Please request a new OTP."
            
            # Increment attempts
            otp.attempts += 1
            otp.save()
            
            # Verify OTP
            if otp.otp_code == otp_code:
                otp.is_verified = True
                otp.verified_at = timezone.now()
                otp.save()
                
                # Mark user as verified and active
                user.is_verified = True
                user.is_active = True
                user.requires_phone_verification = False  # Clear the flag
                user.save()
                
                return True, "Phone number verified successfully"
            else:
                return False, "Invalid OTP code"
                
        except OTPVerification.DoesNotExist:
            return False, "Invalid OTP or OTP not found"
    
    @staticmethod
    def can_resend_otp(user):
        """Check if user can resend OTP (rate limiting)"""
        cache_key = f"otp_resend_{user.id}"
        last_resend = cache.get(cache_key)
        
        if last_resend:
            return False, "Please wait before requesting another OTP"
        
        return True, None
    
    @staticmethod
    def mark_otp_resent(user):
        """Mark that OTP was resent (for rate limiting)"""
        cache_key = f"otp_resend_{user.id}"
        cache.set(cache_key, True, settings.OTP_RESEND_COOLDOWN_SECONDS)


from django.utils import timezone
