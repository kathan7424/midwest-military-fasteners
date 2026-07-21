import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import type { AboutPageFaqItem } from "@/types/about-page.types";

export default function AboutAccordion({ items }: { items: AboutPageFaqItem[] }) {
  return (
    <AccordionPrimitive.Root className="flex w-full flex-col">
      {items.map((item, idx) => (
        <AccordionPrimitive.Item key={idx} className="mb-5 last:mb-0">
          <AccordionPrimitive.Header className="flex">
             <AccordionPrimitive.Trigger className="group relative flex flex-1 items-center justify-between gap-2 bg-[#FAFAFA] px-6 py-4 text-left text-link font-normal text-[#336699] hover:bg-[#f3f3f3] aria-disabled:pointer-events-none aria-disabled:opacity-50">
              {item.question}
              <ChevronDownIcon className="pointer-events-none shrink-0 text-[#CC9900] group-aria-expanded:hidden" />
              <ChevronUpIcon className="pointer-events-none hidden shrink-0 text-[#CC9900] group-aria-expanded:inline" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>

          <AccordionPrimitive.Panel className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
            <div className="bg-white px-4 pt-5 pb-0">
              <div
                className="prose prose-sm max-w-none text-link leading-6 text-black last:mb-0"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </div>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
