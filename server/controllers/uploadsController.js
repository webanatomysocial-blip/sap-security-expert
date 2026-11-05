const { deleteImage } = require('../utils/helpers');

// POST /api/upload-blog-image
const uploadBlogImage = (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  // Only an admin may remove a previous image, and only one inside the blog upload folder.
  // Contributors never delete files through this endpoint.
  const oldImage = req.body.old_image || '';
  if (oldImage && req.session.role === 'admin' && oldImage.startsWith('/uploads/blogs/') && !oldImage.includes('..')) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/blogs/' + req.file.filename,
  });
};

// POST /api/upload-ad-image
const uploadAdImage = (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  const oldImage = req.body.old_image || '';
  if (oldImage && req.session.role === 'admin' && oldImage.startsWith('/uploads/ads/') && !oldImage.includes('..')) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Ad image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/ads/' + req.file.filename,
  });
};

module.exports = { uploadBlogImage, uploadAdImage };
