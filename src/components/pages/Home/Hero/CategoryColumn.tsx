import Link from "next/link";

interface CategoryColumnProps {
  title: string;
  items: string[];
}

export default function CategoryColumn({
  title,
  items,
}: CategoryColumnProps) {
  return (
    <div className="w-full">
      {/* Column Title */}
      <h3 className=" mb-4 text-[18px] font-bold leading-[1.3] text-white whitespace-normal" > {title} </h3>

      {/* Product List */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item}>
            <Link href="#" className=" text-[16px] font-normal leading-[1.97] text-white underline underline-offset-2 transition-opacity duration-300 hover:opacity-75 " > {item} </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}