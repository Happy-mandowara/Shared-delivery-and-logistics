import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFA] text-[#1c1c1a]">
      <div className="p-8 bg-white border border-stone-200 rounded-xl shadow-sm max-w-md w-full text-center">
        <span className="text-xs font-semibold px-2 py-1 bg-stone-100 text-stone-700 rounded-full">
          Error 404
        </span>
        <h1 className="text-2xl font-bold mt-3 mb-2">Page Not Found</h1>
        <p className="text-sm text-stone-600 mb-6">
          The requested page could not be located on the NationX platform.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-[#0F766E] text-white rounded-xl font-medium text-sm hover:bg-[#0D655E] transition"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
}

