/**
 * File Name: NotFound.tsx
 * Description: Custom 404 page content.
 * Developer: KP-184
 * Created Date: 2026-06-24
 * Last Modified: 2026-06-24
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-6 py-20 text-center">
      <div className="mx-auto relative z-10 flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-5 text-h5 lg:text-h4 font-normal uppercase text-blue">Page not found</p>
          <div className="mx-auto mb-5 w-[40px] md:w-[86px] h-1">
            <svg width="86" height="5" viewBox="0 0 86 5" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto w-full h-auto">
              <line y1="2.5" x2="86" y2="2.5" stroke="#CC9900" strokeWidth={5} />
            </svg>
          </div>
          <h1 className="mx-auto md:max-w-4xl font-bold text-black text-[30px] sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px] leading-[1.1]">The content you were looking for could not be found.</h1>
          <Link
            href="/"
            prefetch={false}
            className="mt-10 inline-flex items-center justify-center gap-3 rounded-none bg-amber px-[28px] py-3 text-body font-bold uppercase text-white shadow-sm transition hover:bg-[#b38600]"
          ><svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.950293 7.51807L7.55967 0.908692L8.46846 -9.73605e-05L10.3687 1.85879C10.286 1.9001 8.55107 3.67637 5.08115 7.14629H21.6872V9.79004H5.08115C8.55107 13.26 10.286 15.0362 10.3687 15.0775L8.46846 16.9364L7.55967 16.0276L0.950293 9.41826L0.000195298 8.46816L0.950293 7.51807Z" fill="white" />
            </svg>
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
