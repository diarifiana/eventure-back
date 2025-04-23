// Require the cloudinary library
const cloudinary = require("cloudinary").v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true,
});

// Log the configuration
console.log(cloudinary.config());

/////////////////////////
// Uploads an image file
/////////////////////////
const uploadImage = async (imagePath: string) => {
  // Use the uploaded file's name as the asset's public ID and
  // allow overwriting the asset with new versions
  const options = {
    folder: "proofs",
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  };

  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log(result);
    return result.public_id;
  } catch (error) {
    console.error(error);
  }
};

//////////////////
//
// Main function
//
//////////////////
(async () => {
  // Set the image to upload
  const imagePath =
    "https://images.unsplash.com/photo-1558980394-4c7c9299fe96?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  // Upload the image
  const publicId = await uploadImage(imagePath);

  // Log the image tag to the console
  console.log(publicId);
})();
