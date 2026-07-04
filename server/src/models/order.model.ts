import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    consumerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'MarketplaceListing', index: true },
    productName: { type: String, trim: true },
    quantity: { type: Number, min: 1 },
    pricePerKg: { type: Number, min: 0 },
    items: { type: [orderItemSchema], required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
    orderStatus: { type: String, enum: ['placed', 'accepted', 'shipped', 'delivered'], default: 'placed' },
    paymentProvider: { type: String, enum: ['manual', 'stripe', 'razorpay'], default: 'manual' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid', index: true },
    paymentId: { type: String, trim: true, index: true, sparse: true },
    paidAt: { type: Date },
    purchaseStatus: { type: String, enum: ['BOUGHT'], default: 'BOUGHT', index: true },
    purchaseTime: { type: Date, default: Date.now },
    deliveryStatus: {
      type: String,
      enum: ['PENDING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      default: 'PENDING_PICKUP',
      index: true,
    },
    assignedDeliveryAgentId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    pickedUpAt: { type: Date, default: null },
    outForDeliveryAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    farmerNotified: { type: Boolean, default: true, index: true },
    checkoutSessionId: { type: String, index: true, sparse: true },
    deliveryAddress: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      location: { type: String, required: true, trim: true },
      notes: { type: String, trim: true },
    },
    pickupLocation: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrderModel = mongoose.model('Order', orderSchema);
