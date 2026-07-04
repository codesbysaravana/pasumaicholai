import { useState, useRef } from "react";
import { Image as ImageIcon, Send, X, Smile, MapPin, Loader2, Globe, Users, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { communityApi } from "../services/communityApi";

interface CreatePostProps {
    onPostCreated: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
    const [description, setDescription] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'>('PUBLIC');
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useState<{ name: string; coordinates: number[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setImages(prev => [...prev, ...files]);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleGetLocation = () => {
        if (location) {
            setLocation(null);
            return;
        }
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLocation({
                    name: "Tamil Nadu, India", // Reverse geocode in production
                    coordinates: [pos.coords.longitude, pos.coords.latitude]
                });
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() && images.length === 0) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("description", description);
            formData.append("visibility", visibility);
            images.forEach(img => formData.append("images", img));
            if (location) formData.append("location", JSON.stringify(location));

            await communityApi.createPost(formData);
            setDescription("");
            setImages([]);
            setPreviews([]);
            setLocation(null);
            onPostCreated();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-emerald-500/5 border border-emerald-50 p-6 mb-8">
            <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                    <Smile size={28} />
                </div>
                <form onSubmit={handleSubmit} className="flex-1">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What's growing on your farm today?"
                        className="w-full border-none focus:ring-0 text-gray-800 placeholder-gray-300 resize-none min-h-[100px] py-2 text-lg font-medium"
                    />

                    {previews.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {previews.map((src, i) => (
                                <motion.div key={i} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-video rounded-xl overflow-hidden group">
                                    <img src={src} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-emerald-50">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <ImageIcon size={18} className="text-emerald-500" />
                                Photo
                            </button>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${location ? 'bg-amber-100 text-amber-600' : 'text-amber-500 hover:bg-amber-50'}`}
                            >
                                <MapPin size={18} />
                                {location ? 'Tagged' : 'Tag'}
                            </button>

                            <div className="relative group/vis">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-gray-400 hover:bg-gray-50 px-3 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    {visibility === 'PUBLIC' ? <Globe size={18} /> : visibility === 'FOLLOWERS' ? <Users size={18} /> : <Lock size={18} />}
                                    {visibility}
                                </button>
                                <div className="absolute left-0 bottom-full mb-2 bg-white shadow-xl rounded-2xl p-2 hidden group-hover/vis:block border border-gray-100 z-10 w-40">
                                    {['PUBLIC', 'FOLLOWERS', 'PRIVATE'].map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setVisibility(v as any)}
                                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-[#0c2e25] text-white px-8 py-3 rounded-2xl font-black hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            <span className="text-xs uppercase tracking-widest">Publish</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
