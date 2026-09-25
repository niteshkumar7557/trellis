import Icon from "./Icon";

export default function WorkspaceSwitcher() {
  return (
    <button className="workspace-switcher" type="button">
      <span className="avatar avatar-small">AS</span>
      <span className="workspace-name">
        <strong>Nitesh&apos;s space</strong>
        <small>Personal</small>
      </span>
      <Icon name="menu" size={15} />
    </button>
  );
}
