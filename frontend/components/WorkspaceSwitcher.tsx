import Icon from "./Icon";

export default function WorkspaceSwitcher() {
  return (
    <button
      className="workspace-switcher w-full py-2.5 px-[9px] flex items-center gap-[9px] border-0 rounded-lg text-[#393531] dark:text-[#eee9e4] text-left bg-transparent hover:bg-[#ebe8e3] dark:hover:bg-[#302e2b] cursor-pointer"
      type="button"
    >
      <span className="avatar avatar-small shrink-0 grid place-items-center rounded-full font-semibold w-[27px] h-[27px] text-white bg-[#33302e] text-[9px]">
        AS
      </span>
      <span className="workspace-name flex flex-1 flex-col gap-0.5">
        <strong className="text-[12px] font-medium leading-normal">Nitesh&apos;s space</strong>
        <small className="text-[#6f6862] text-[11px] leading-normal font-normal">Personal</small>
      </span>
      <Icon name="chevronDown" size={15} />
    </button>
  );
}
