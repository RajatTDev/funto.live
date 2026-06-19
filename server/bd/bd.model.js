const mongoose = require("mongoose");

const bdSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //_id of the user who became BD
        name: { type: String, trim: true },
        image: String,
        mobile: { type: String },
        uniqueId: { type: Number }, //uniqueId of the user
        bdCode: { type: String }, //unique BD code 

        regions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Region" }], //assigned regions

        rCoin: { type: Number, default: 0 }, //total lifetime earnings
        totalWithdrawn: { type: Number, default: 0 }, //lifetime withdrawn
        netCoin: { type: Number, default: 0 }, //withdrawable balance

        bdCommission: { type: Number, default: 10 }, //commission of BD in wallet

        loginString: { type: String, default: "", unique: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

bdSchema.index({ isActive: 1 });
bdSchema.index({ uniqueId: 1 });
bdSchema.index({ user: 1 });
bdSchema.index({ bdCode: 1 });
bdSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Bd", bdSchema);
