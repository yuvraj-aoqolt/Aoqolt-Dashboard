import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { FiArrowLeft, FiCalendar, FiUser, FiEdit2, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { blogsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function BlogDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [blog, setBlog]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    blogsAPI
      .detail(slug)
      .then(({ data }) => setBlog(data.data || data))
      .catch(() => navigate('/blogs', { replace: true }))
      .finally(() => setLoading(false))
  }, [slug])

  const canEdit = user && (
    user.role === 'superadmin' ||
    (user.can_manage_blogs && blog?.author?.id === user.id)
  )

  const handleDelete = async () => {
    if (!window.confirm('Delete this blog post?')) return
    setDeleting(true)
    try {
      await blogsAPI.delete(blog.id)
      toast.success('Blog deleted.')
      navigate('/blogs')
    } catch {
      toast.error('Failed to delete blog.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center pt-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/10 border-t-red-500 rounded-full"
        />
      </div>
    )
  }

  if (!blog) return null

  const date = blog.published_at || blog.created_at

  return (
    <div className="min-h-screen bg-dark pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            <FiArrowLeft size={15} />
            Back to Blog
          </Link>
        </motion.div>

        {/* Hero image */}
        {blog.poster_image_url && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden mb-10 aspect-[21/9]"
          >
            <img
              src={blog.poster_image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Meta + title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-4 text-xs text-white/35">
              {blog.author?.full_name && (
                <span className="flex items-center gap-1.5">
                  {blog.author.avatar ? (
                    <img src={blog.author.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-900/40 flex items-center justify-center text-red-500 text-[9px] font-bold">
                      {blog.author.full_name[0]}
                    </div>
                  )}
                  <FiUser size={10} />
                  {blog.author.full_name}
                </span>
              )}
              {date && (
                <span className="flex items-center gap-1">
                  <FiCalendar size={10} />
                  {format(new Date(date), 'MMMM d, yyyy')}
                </span>
              )}
            </div>

            {/* Author actions */}
            {canEdit && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/blogs/edit/${blog.id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                >
                  <FiEdit2 size={11} /> Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-500 transition-all disabled:opacity-50"
                >
                  <FiTrash2 size={11} />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            {blog.title}
          </h1>

          <p className="text-white/50 text-lg leading-relaxed border-l-2 border-red-700/40 pl-4 mb-10">
            {blog.description}
          </p>
        </motion.div>

        {/* Full content — rendered as HTML */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose-blog"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Gallery */}
        {blog.gallery_images?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <h3 className="text-white/50 text-sm uppercase tracking-wider mb-5">Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {blog.gallery_images.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden aspect-square">
                  <img src={img.image} alt={img.caption || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back button */}
        <div className="mt-14 pt-8 border-t border-white/5">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-red-500 hover:text-red-300 text-sm font-medium transition-colors"
          >
            <FiArrowLeft size={14} />
            All Articles
          </Link>
        </div>
      </div>
    </div>
  )
}
