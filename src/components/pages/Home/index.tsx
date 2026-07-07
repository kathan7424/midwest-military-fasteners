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
