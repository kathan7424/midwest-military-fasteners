/**
 * File Name: footer.tsx
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (

    <footer className="bg-white">
  
  <div className="mx-auto max-w-[1680px] px-5">
    <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:justify-center md:gap-16">

      <Link href="/" prefetch={false} className="shrink-0 block">
          <Image
            src="/images/ISO_9001-2015-logo.svg"
            alt="Midwest Military Fasteners"
            width={164}
            height={144}
            className="h-auto w-[164px]"
            priority
          />
        </Link>

     
      <div className="max-w-[900px] text-center md:text-left">
        <h2 className="mb-4 text-3xl font-bold text-black">
          Your First & Final Stop for Standard and Specialty Fasteners.
        </h2>

        <p className="mb-4 text-lg leading-relaxed text-gray-700">
          Proudly serving customers ranging from small machine shops, to the military,
          aerospace, marine, and heavy industrial. We are the fast, honest, and
          knowledgeable supplier for your critical hardware needs.
        </p>

        <p className="text-lg text-gray-700">
          ISO 9001:2015 Registered
        </p>
      </div>

    </div>
  </div>


  <div className="bg-[#c79a00]">
    <div className="mx-auto max-w-[1680px] px-5">
      <div className="flex flex-col items-center justify-between gap-4 py-4 text-sm text-white lg:flex-row">

        <div>
          Copyright 2026 Midwest Military Fasteners LLC
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-6">
          <li>
            <a
              href="#"
              className="transition-opacity hover:opacity-80"
            >
              Privacy Policy
            </a>
          </li>
          <li>
            <a
              href="#"
              className="transition-opacity hover:opacity-80"
            >
              Shipping & Returns
            </a>
          </li>
          <li>
            <a
              href="#"
              className="transition-opacity hover:opacity-80"
            >
              Terms
            </a>
          </li>
        </ul>

        <div>
          Website Design by{" "}
          <a href="#" className="hover:underline">
            build/create
          </a>
        </div>

      </div>
    </div>
  </div>
</footer>


    // <footer className="bg-black text-white mt-auto">
      
    //   <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

    //     {/* Brand Section */}
    //     <div>
    //       <h2 className="text-xl font-bold mb-3">
    //         Midwest Military
    //       </h2>

    //       <p className="text-sm text-gray-400">
    //         Premium quality products built for performance, durability, and reliability.
    //       </p>
    //     </div>

    //     {/* Quick Links */}
    //     <div>
    //       <h3 className="text-lg font-semibold mb-3">
    //         Quick Links
    //       </h3>

    //       <ul className="space-y-2 text-sm text-gray-400">
    //         <li>Home</li>
    //         <li>Products</li>
    //         <li>About Us</li>
    //         <li>Contact</li>
    //       </ul>
    //     </div>

    //     {/* Contact */}
    //     <div>
    //       <h3 className="text-lg font-semibold mb-3">
    //         Contact
    //       </h3>

    //       <ul className="space-y-2 text-sm text-gray-400">
    //         <li>Email: support@midwest.com</li>
    //         <li>Phone: +1 234 567 890</li>
    //         <li>Location: USA</li>
    //       </ul>
    //     </div>

    //   </div>

    //   {/* Bottom Bar */}
    //   <div className="border-t border-gray-800 text-center py-4 text-sm text-gray-500">
    //     © {new Date().getFullYear()} Midwest Military. All rights reserved.
    //   </div>

    // </footer>
  );
}