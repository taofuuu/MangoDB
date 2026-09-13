import LoginCard from '@/components/auth/LoginCard';
import DecorativePattern from '@/components/auth/Decorate';

export default function LoginPage() {
    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-accent-tint">
            <DecorativePattern
                className="
          pointer-events-none
          absolute
          left-0
          top-0
          hidden
          h-screen
          aspect-[1366/2192]
          overflow-hidden
          rounded-br-[calc(100vh*1366/2192)]
          opacity-80
          sm:block
        "
                /* h-screen at aspect 1366/2192, so the width is
                   100vh x 1366/2192 = 62vh. Hidden below sm. */
                sizes="(min-width: 640px) 62vh, 1px"
            />

            <div className="absolute inset-0 flex items-center justify-center p-6">
                <LoginCard />
            </div>
        </main>
    );
}
