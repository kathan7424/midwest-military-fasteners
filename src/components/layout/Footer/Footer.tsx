/**
 * File Name: footer.tsx
 * Description: Site footer — copyright + legal links bar. The ISO trust block
 *              now lives in the shared <IsoSection /> rendered per page.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-01
 */

export default function Footer() {
  return (
    <footer className="bg-amber">
      <div className="mx-auto max-w-[1680px] px-5">
        <div className="flex flex-col items-center justify-between gap-8 py-4 text-link text-white/70 lg:flex-row lg:gap-4">

          <div className="mb-0 text-center lg:text-left">
            Copyright 2026 Midwest Military Fasteners LLC
          </div>

          <ul className="flex flex-col flex-wrap items-center justify-center gap-2.5 md:flex-row md:gap-6">
            <li>
              <a href="#" className="transition-colors hover:text-black">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-black">
                Shipping & Returns
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-black">
                Terms
              </a>
            </li>
          </ul>

          <div>
            Website Design by{" "}
            <a href="#" className="transition-colors hover:text-black">
              build/create
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
