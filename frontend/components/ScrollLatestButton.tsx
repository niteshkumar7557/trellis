import Icon from "./Icon";

interface ScrollLatestButtonProps {
  onClick: () => void;
}

export default function ScrollLatestButton({
  onClick,
}: ScrollLatestButtonProps) {
  return (
    <button
      className="scroll-latest-button absolute right-8 max-[700px]:right-4.5 bottom-22.75 max-[700px]:bottom-21 z-2 h-8.5 px-3 flex items-center gap-1.75 border border-[#ded5ce] dark:border-[#514943] rounded-full text-[#766d66] dark:text-[#c0b7af] bg-[rgba(255,255,255,0.96)] dark:bg-[rgba(43,40,37,0.96)] shadow-[0_5px_14px_rgba(50,43,37,0.1)] dark:shadow-[0_5px_14px_rgba(0,0,0,0.25)] text-[11px] font-medium transition-[color,border-color,transform] duration-180 ease-out hover:border-[#c5a095] dark:hover:border-[#896055] hover:text-[#9d6252] dark:hover:text-[#e1a18e] hover:-translate-y-px cursor-pointer"
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
    >
      <Icon name="arrowDown" size={15} /> Latest
    </button>
  );
}
