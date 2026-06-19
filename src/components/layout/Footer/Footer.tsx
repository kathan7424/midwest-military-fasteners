/**
 * File Name: footer.tsx
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-auto">
      
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Brand Section */}
        <div>
          <h2 className="text-xl font-bold mb-3">
            Midwest Military
          </h2>

          <p className="text-sm text-gray-400">
            Premium quality products built for performance, durability, and reliability.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Quick Links
          </h3>

          <ul className="space-y-2 text-sm text-gray-400">
            <li>Home</li>
            <li>Products</li>
            <li>About Us</li>
            <li>Contact</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Contact
          </h3>

          <ul className="space-y-2 text-sm text-gray-400">
            <li>Email: support@midwest.com</li>
            <li>Phone: +1 234 567 890</li>
            <li>Location: USA</li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 text-center py-4 text-sm text-gray-500">
        © {new Date().getFullYear()} Midwest Military. All rights reserved.
      </div>

    </footer>
  );
}