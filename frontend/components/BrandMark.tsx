export default function BrandMark() {
  return (
    <div
      className="brand-mark flex items-center gap-[9px] px-3 max-[700px]:p-0 text-[#201f1d] dark:text-[#eee9e4] font-manrope text-[19px] font-bold tracking-[-0.6px]"
      aria-label="Kero home"
    >
      <span className="brand-orb w-[22px] h-[22px] inline-block rounded-[50%_50%_47%_53%] bg-[#ba806e] dark:bg-[#c78d78] shadow-[inset_-3px_-3px_0_#a86e5f] dark:shadow-[inset_-3px_-3px_0_#a97060] -rotate-[25deg]" />
      <span className="max-[700px]:hidden">Trellis</span>
    </div>
  );
}
