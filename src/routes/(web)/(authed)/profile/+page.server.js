import { FILE_CATEGORY } from "$lib/constants/constants";
import { userAccountSchema } from "./schemas/user-account.schema";
import { passwordSchema } from "./schemas/password.schema";
import { deleteUserAccount, loadUserAccount, updateUserAccount } from "$components/data-model/user-account/user-account.server";
import { prisma } from "$lib/server/prisma-instance";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import argon2 from "argon2";
import { error } from "@sveltejs/kit";

/** @type {import('./$types').PageServerLoad} */
export const load = async (event) => {
    const userAccountData = await loadUserAccount(event?.locals?.user?.id);
    const userAccount = userAccountData.userAccount;

    const userForm = await superValidate(zod(userAccountSchema));
    const passwordForm = await superValidate(zod(passwordSchema));
    if (!userAccount) return { userForm, passwordForm };

    passwordForm.data.id = userAccount?.id;

    userForm.data.id = userAccount?.id;
    userForm.data.firstName = userAccount?.firstName;
    userForm.data.lastName = userAccount?.lastName;
    userForm.data.username = userAccount?.username;
    userForm.data.emailAddress = userAccount?.emailAddress;

    const profilePicture = await prisma.file.findFirst({
        where: { linkedEntity: "userAccount", linkedEntityId: event?.locals?.user?.id, category: FILE_CATEGORY.PROFILE_PICTURE }
    });

    return { userForm, passwordForm, profilePicture };
};

/** @type {import('./$types').Actions} */
export const actions = {
    updateUser: async (event) => {
        const form = await superValidate(event, zod(userAccountSchema));

        if (!form.valid) return fail(400, { form });

        await updateUserAccount(form.data);

        form.message = "Updated profile";

        return { form };
    },
    deleteUser: async (event) => {
        const form = await superValidate(event, zod(userAccountSchema));

        if (!form.data?.id) return fail(400, { form });

        await deleteUserAccount(form.data.id);

        form.message = "Deleted user";

        return { form };
    },
    updatePassword: async (event) => {
        const form = await superValidate(event, zod(passwordSchema));

        if (!form.valid) return fail(400, { form });

        const hashedPassword = await argon2.hash(form.data.password);

        await updateUserAccount({ id: form.data.id, hashedPassword });

        form.message = "Updated password";

        return { form };
    },
    updateProfilePictureDisplayName: async (event) => {
        event.locals.auth.isAuthenticated();

        const data = await event.request.formData();
        const displayName = data.get("displayName");
        const fileId = data.get("id");

        await prisma.file.update({
            where: {
                id: fileId,
                linkedEntity: "userAccount",
                linkedEntityId: event.locals.user?.id,
                category: FILE_CATEGORY.PROFILE_PICTURE
            },
            data: { displayName }
        });

        return { message: "Updated successfully!" };
    }
};
