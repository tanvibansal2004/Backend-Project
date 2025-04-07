import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // determines which type of file is coming, image, audio, video, etc.
        })
        // file has been uploaded successfully
        console.log("File uploaded on Cloudinary ", response.url) // logs the public url that is formed after upload - this is logged for us, need to show smth to the user as well - see next line
        return response // chahe toh poora response bhej do user can get whatever they want from this, chahe toh sirf url bhej do - depends on us completely.
    } catch (error) {
        // if somebody is using this method, then we atleast know that the file is atleast there on our server
        // therefore we should remove them from our server for safety purpose - otherwise malacious or corrupted files will stay on our server!
        fs.unlinkSync(localFilePath) // unlinkSync mtlb yeh hona hi chahiye uske baad hi hum aage badhenge!
        //removes the locally saved temporary file as the upload operation got failed
        return null
    }
}

export {uploadOnCloudinary}