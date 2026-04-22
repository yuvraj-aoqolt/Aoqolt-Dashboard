/**
 * CreateEditBlogPage
 * Route: /blogs/create  OR  /blogs/edit/:id
 * Accessible only to blog managers and superadmin.
 *
 * Uses a toolbar + contenteditable div as a lightweight rich-text solution
 * (no extra npm package needed — works with execCommand where supported,
 *  and stores/submits the innerHTML as HTML content).
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiBold, FiItalic, FiUnderline, FiList, FiLink,
  FiImage, FiSave, FiEye, FiTrash2, FiAlignLeft, FiAlignCenter,
} from 'react-icons/fi'
import { blogsAPI } from '../../api'
import { useAuth } from '../../context/AuthContext'

// ── Toolbar button ─────────────────────────────────────────────────────────
function ToolBtn({ icon: Icon, title, onClick, active }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all
        ${active ? 'bg-red-600/30 text-red-300' : 'text-white/40 hover:text-white hover:bg-white/8'}`}
    >
      <Icon size={14} />
    </button>
  )
}

// ── Image upload inside editor ─────────────────────────────────────────────
function insertImageAtCursor(url) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return
  const range = sel.getRangeAt(0)
  const img = document.createElement('img')
  img.src = url
  img.style.maxWidth = '100%'
  img.style.borderRadius = '8px'
  img.style.margin = '8px 0'
  range.deleteContents()
  range.insertNode(img)
  range.setStartAfter(img)
  sel.removeAllRanges()
  sel.addRange(range)
}

export default function CreateEditBlogPage() {
  const { id } = useParams()            // present when editing
  const isEdit  = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const editorRef    = useRef(null)
  const posterInput  = useRef(null)
  const galleryInput = useRef(null)

  const [saving, setSaving]         = useState(false)
  const [posterPreview, setPoster]  = useState(null)
  const [posterFile, setPosterFile] = useState(null)
  const [blogId, setBlogId]         = useState(id || null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { status: 'draft' } })

  // ── Load blog for editing ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    blogsAPI
      .myBlogs()
      .then(({ data }) => {
        const list = data.results || []
        const blog = list.find((b) => b.id === id)
        if (!blog) { toast.error('Blog not found.'); navigate('/blogs/my'); return }
        reset({
          title: blog.title,
          description: blog.description,
          status: blog.status,
          poster_image_alt: blog.poster_image_alt || '',
          meta_title: blog.meta_title || '',
          meta_description: blog.meta_description || '',
        })
        if (editorRef.current) editorRef.current.innerHTML = blog.content || ''
        if (blog.poster_image_url) setPoster(blog.poster_image_url)
        setBlogId(blog.id)
      })
      .catch(() => { toast.error('Failed to load blog.'); navigate('/blogs/my') })
  }, [id])

  // ── Rich-text toolbar commands ────────────────────────────────────────────
  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const handlePosterChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPosterFile(file)
    setPoster(URL.createObjectURL(file))
  }

  // ── Insert inline image via URL prompt ────────────────────────────────────
  const handleInsertImage = () => {
    const url = window.prompt('Image URL:')
    if (url) insertImageAtCursor(url)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (formValues) => {
    const html = editorRef.current?.innerHTML?.trim() || ''
    if (!html || html === '<br>') {
      toast.error('Content cannot be empty.')
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', formValues.title)
      fd.append('description', formValues.description)
      fd.append('content', html)
      fd.append('status', formValues.status)
      if (formValues.poster_image_alt) fd.append('poster_image_alt', formValues.poster_image_alt)
      if (formValues.meta_title)       fd.append('meta_title', formValues.meta_title)
      if (formValues.meta_description) fd.append('meta_description', formValues.meta_description)
      if (posterFile)                  fd.append('poster_image', posterFile)

      let blog
      if (isEdit && blogId) {
        const { data } = await blogsAPI.update(blogId, fd)
        blog = data.data
        toast.success('Blog updated!')
      } else {
        const { data } = await blogsAPI.create(fd)
        blog = data.data
        setBlogId(blog.id)
        toast.success('Blog created!')
      }

      // Upload gallery images if any were selected
      const galleryFiles = galleryInput.current?.files
      if (galleryFiles?.length) {
        for (const file of galleryFiles) {
          const gfd = new FormData()
          gfd.append('image', file)
          await blogsAPI.uploadGallery(blog.id, gfd).catch(() => {})
        }
      }

      navigate(`/blogs/${blog.slug}`)
    } catch (err) {
      const msg = err.response?.data?.detail || Object.values(err.response?.data || {})[0]?.[0] || 'Save failed.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Edit Blog Post' : 'New Blog Post'}
          </h1>
          <p className="text-white/30 text-sm mt-1">
            {isEdit ? 'Update your existing article.' : 'Write and publish a new article.'}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter your article title…"
              className="w-full bg-white/5 border border-white/10 focus:border-red-600/30 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none transition-all text-base"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">
              Short Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={3}
              placeholder="A brief summary shown on blog cards…"
              className="w-full bg-white/5 border border-white/10 focus:border-red-600/30 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none transition-all text-sm resize-none"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Poster Image */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">Poster Image</label>
            <div
              onClick={() => posterInput.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-white/10 hover:border-red-600/30 transition-all overflow-hidden"
            >
              {posterPreview ? (
                <img src={posterPreview} alt="poster" className="w-full max-h-52 object-cover" />
              ) : (
                <div className="h-36 flex flex-col items-center justify-center gap-2 text-white/25">
                  <FiImage size={28} />
                  <span className="text-xs">Click to upload poster image</span>
                </div>
              )}
            </div>
            <input ref={posterInput} type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
          </div>

          {/* Poster Image Alt Text */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">Image Alt Text</label>
            <input
              {...register('poster_image_alt')}
              placeholder="Describe the poster image for SEO and accessibility…"
              className="w-full bg-white/5 border border-white/10 focus:border-red-600/30 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none transition-all text-sm"
            />
          </div>

          {/* Rich-text editor */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">
              Content <span className="text-red-500">*</span>
            </label>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-white/3 border border-white/8 rounded-t-xl border-b-0">
              <ToolBtn icon={FiBold}       title="Bold"           onClick={() => exec('bold')} />
              <ToolBtn icon={FiItalic}     title="Italic"         onClick={() => exec('italic')} />
              <ToolBtn icon={FiUnderline}  title="Underline"      onClick={() => exec('underline')} />
              <div className="w-px h-5 bg-white/10 mx-1" />
              <ToolBtn icon={FiAlignLeft}  title="Left"           onClick={() => exec('justifyLeft')} />
              <ToolBtn icon={FiAlignCenter}title="Center"         onClick={() => exec('justifyCenter')} />
              <div className="w-px h-5 bg-white/10 mx-1" />
              <ToolBtn icon={FiList}       title="Bullet list"    onClick={() => exec('insertUnorderedList')} />
              <ToolBtn icon={FiLink}       title="Insert link"    onClick={() => {
                const url = window.prompt('URL:')
                if (url) exec('createLink', url)
              }} />
              <ToolBtn icon={FiImage}     title="Insert image"   onClick={handleInsertImage} />
            </div>

            {/* Editable area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing your article here…"
              className="min-h-[300px] bg-white/4 border border-white/8 rounded-b-xl px-5 py-4 text-white/80 text-sm leading-relaxed outline-none focus:border-red-600/20 transition-all prose-blog"
              style={{ caretColor: '#ef4444' }}
              onInput={() => {}}
            />
          </div>

          {/* Gallery images */}
          <div>
            <label className="block text-white/55 text-xs uppercase tracking-wider mb-2">
              Gallery Images (optional)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white/50 hover:text-white text-xs transition-all">
              <FiImage size={13} />
              Choose gallery images
              <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" />
            </label>
          </div>



          {/* Status + Submit */}
          <div className="flex items-center gap-4 pt-2">
            <select
              {...register('status')}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 outline-none text-sm transition-all cursor-pointer"
            >
              <option value="draft"     className="bg-gray-900">Save as Draft</option>
              <option value="published" className="bg-gray-900">Publish</option>
            </select>

            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Saving…
                </>
              ) : (
                <>
                  <FiSave size={15} />
                  {isEdit ? 'Update' : 'Create'} Post
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  )
}
