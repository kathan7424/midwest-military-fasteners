import Hero from "./Hero";
import IsoSection from "@/components/shared_Ui/IsoSection";
import { resolveCategorySections } from "@/utils/catalog.utils";

export default function HomePage() {
  return (
    <>
      <Hero
        banner={{ banner_title: "", banner_image: null }}
        categories={resolveCategorySections([])}
      />

      <div className="mx-auto max-w-[1680px] px-5">
        <IsoSection align="center" />
      </div>
    </>
  );
}
