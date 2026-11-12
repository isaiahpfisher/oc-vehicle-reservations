import userServices from "../services/userServices.js";
import { fullName } from "../models/users.js";
import { useConfirm } from "./useConfirm.js";

/** Confirm, then delete a user. The returned function resolves `true` once the user is deleted. */
export const useDeleteUser = () => {
  const confirm = useConfirm();

  return (user) =>
    confirm({
      title: "Delete user",
      message: `Delete "${fullName(user)}"? This action is permanent.`,
      confirmText: "Delete User",
      confirmColor: "error",
      onConfirm: () => userServices.deleteUser(user.id),
    });
};
