import ReviewExtracted from "@/Components/InvoiceManagement/ReviewExtracted";
import { Suspense } from "react";

export default function ReviewExtractedPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <div className="w-8 h-8 animate-spin border-4 border-blue-600 border-t-transparent rounded-full mb-2"></div>
        <p className="text-sm font-semibold">Loading page...</p>
      </div>
    }>
      <ReviewExtracted />
    </Suspense>
  );
}
