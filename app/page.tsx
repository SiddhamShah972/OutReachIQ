import Link from 'next/link'

export default function HomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-xl text-center">
                <h1 className="text-4xl font-bold">OutReachIQ</h1>
                <p className="mt-3 text-gray-600">Land more interviews with smarter outreach.</p>
                <div className="mt-8 flex justify-center gap-3">
                    <Link href="/login" className="rounded-lg bg-black px-5 py-2.5 text-white">Login</Link>
                    <Link href="/register" className="rounded-lg border px-5 py-2.5">Register</Link>
                </div>
            </div>
        </main>
    )
}