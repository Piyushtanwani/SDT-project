const ROLE_LABELS = {
  user: "Community Member",
  admin: "Administrator",
};

const formatRole = (role) => {
  if (!role) {
    return "";
  }
  return ROLE_LABELS[String(role).toLowerCase()] || role;
};

export default formatRole;
