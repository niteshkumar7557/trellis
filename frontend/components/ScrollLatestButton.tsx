import Icon from "./Icon";

interface ScrollLatestButtonProps {
  onClick: () => void;
}

export default function ScrollLatestButton({
  onClick,
}: ScrollLatestButtonProps) {
  return (
    <button
      className="scroll-latest-button"
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
    >
      <Icon name="arrowDown" size={15} /> Latest
    </button>
  );
}
