import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

type FAQItem = { q: string; a: string };

export default function AboutAccordion({ items }: { items: FAQItem[] }) {
  return (
    <AccordionPrimitive.Root className="w-full flex flex-col">
      {items.map((it, idx) => (
        <AccordionPrimitive.Item key={idx} className="mb-5 last:mb-0">
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
              className="group relative flex flex-1 items-center justify-between gap-2 bg-[#FAFAFA] py-4 px-6 text-left text-lg font-normal text-[#336699] hover:bg-[#f3f3f3] aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              {it.q}
              <ChevronDownIcon className="pointer-events-none shrink-0 group-aria-expanded:hidden text-[#CC9900]" />
              <ChevronUpIcon className="pointer-events-none hidden shrink-0 group-aria-expanded:inline text-[#CC9900]" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>

          <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
            <div className="bg-white px-6 py-6 pb-0">
              <p className="text-black text-link leading-6 last:mb-0">{it.a}</p>
            </div>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
