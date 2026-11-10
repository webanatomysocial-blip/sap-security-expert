const { deleteImage } = require('../utils/helpers');
const { processUpload } = require('../services/ImageService');

// POST /api/upload-blog-image
const uploadBlogImage = async (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  // Optimization is best-effort. The original remains the canonical URL so a
  // Sharp failure can never make a successful upload inaccessible.
  let variants = [];
  if (req.file.path) {
    try {
      const result = await processUpload(req.file.path, 'content');
      variants = result.outputs.map((v) => ({ width: v.width, path: `/uploads/blogs/${require('path').basename(v.path)}` }));
    } catch (err) {
      console.warn('[image] variants unavailable:', err.message);
    }
  }

  // Only an admin may remove a previous image, and only one inside the blog upload folder.
  // Contributors never delete files through this endpoint.
  const oldImage = req.body.old_image || '';
  if (oldImage && req.session.role === 'admin' && oldImage.startsWith('/uploads/blogs/') && !oldImage.includes('..')) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/blogs/' + req.file.filename,
    variants,
  });
};

// POST /api/upload-ad-image
const uploadAdImage = async (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  let variants = [];
  if (req.file.path) {
    try {
      const result = await processUpload(req.file.path, 'content');
      variants = result.outputs.map((v) => ({ width: v.width, path: `/uploads/ads/${require('path').basename(v.path)}` }));
    } catch (err) {
      console.warn('[image] variants unavailable:', err.message);
    }
  }

  const oldImage = req.body.old_image || '';
  if (oldImage && req.session.role === 'admin' && oldImage.startsWith('/uploads/ads/') && !oldImage.includes('..')) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Ad image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/ads/' + req.file.filename,
    variants,
  });
};

module.exports = { uploadBlogImage, uploadAdImage };
