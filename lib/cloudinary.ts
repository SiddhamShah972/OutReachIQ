import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadFile(
  fileBuffer: Buffer,
  options: {
    folder: string
    publicId?: string
    resourceType?: 'raw' | 'image' | 'video' | 'auto'
  }
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'raw',
      },
      (error, result) => {
        if (error) reject(error)
        else if (result) resolve({ url: result.secure_url, publicId: result.public_id })
        else reject(new Error('Upload failed'))
      }
    ).end(fileBuffer)
  })
}

export async function deleteFile(publicId: string, resourceType: 'raw' | 'image' = 'raw') {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}

export { cloudinary }
