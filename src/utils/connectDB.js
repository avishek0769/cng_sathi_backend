import mongoose from "mongoose";

const connectDB = async ()=>{
    console.log(process.env.MONGODB_URI);
    try {
        const connInstance = await mongoose.connect(`${process.env.MONGODB_URI}/CNG_Sathi`);
        console.log(`Database connected !! -> DB Host: ${connInstance.connection.host}`);
    }
    catch (error) {
        console.log("MongoDB connection FAILED: ", error);
        process.exit(1)
    }
}

export default connectDB