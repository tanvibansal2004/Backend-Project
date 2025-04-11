import mongoose, {Schema} from "mongoose";
import { User } from "./user.model.js";

const subscriptionSchema = new Schema({
    subscriber: { // the one who is subscribing
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: { // the one to who subscribers subscribe
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)