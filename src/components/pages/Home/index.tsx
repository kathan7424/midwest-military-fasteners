/**
 * File Name: index.tsx
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-07-10
 * Last Modified: 2026-07-10
 */

import Hero from "./Hero";
import IsoSection from "@/components/shared_Ui/IsoSection";

export default function HomePage() {
  return (
    <>
      <Hero
        banner={{ banner_title: "", banner_image: null }}
        categories={[]}
      />

      <div className="mx-auto max-w-[1680px] px-5">
        <IsoSection align="center" />
      </div>
    </>
  );
}
