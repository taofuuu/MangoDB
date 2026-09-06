'use client';

import { useState } from 'react';

export type ProfileData = {
    username: string;
    email: string;
    password?: string;
};

type EditProfileFormProps = {
    isOpen: boolean;
    initialData?: ProfileData;
    onClose: () => void;
    onSave: (data: ProfileData) => void;
};

export default function EditProfileForm({
    isOpen,
    initialData,
    onClose,
    onSave,
}: EditProfileFormProps) {
    const [username, setUsername] = useState(initialData?.username || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [password, setPassword] = useState(initialData?.password || '');
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            username: username.trim(),
            email: email.trim(),
            password,
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-[45vw] max-h-[92vh] overflow-y-auto rounded-xl bg-[#FFFDF9] text-[#171717] p-[1.5vw] shadow-xl min-w-[320px] max-md:max-w-[85vw] max-sm:max-w-[95vw] max-md:p-6">
                {/* -------------header----------------- */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Edit Profile</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#828282] hover:text-gray-800 transition-colors"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* ----------------element-1----------------- */}
                <hr className="border-[#3F6B80]/50 my-2" />
                <div>
                    <label className="my-2 block text-sm !text-[12px]">
                        *Indicates required
                    </label>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        {/* Username */}
                        <div>
                            <label className="block text-sm">Username*</label>

                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: johndoe"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm">Email*</label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-[4.07vh] w-full px-1.5 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                placeholder="Ex: johndoe@example.com"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm">Password*</label>

                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="h-[4.07vh] w-full px-1.5 pr-12 rounded-input border border-[#497B93] bg-[#FFFFFF]/80 text-sm text-[#171717] placeholder:text-[#D6D6D6] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                                    placeholder="Enter password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#666666] hover:text-[#171717] transition-colors"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-[#3F6B80]/50 my-4" />

                    {/* -----------------footer----------------- */}
                    <div className="flex justify-end items-center gap-3">
                        <button
                            type="submit"
                            className="rounded-status bg-[#3F6B80] w-[7vw] min-w-[80px] h-[4vh] text-[#FFFDF9] text-sm !font-[500] hover:bg-[#34596b] transition-colors"
                        >
                            save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
