import { fail } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma-instance";
import { message, setError, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { userAccountCreateSchema, userAccountUpdateSchema } from "$lib/components/data-model/user-account/user-account.schema";

import {
    loadUserAccount,
    getUserAccountRelationshipData,
    updateUserAccount
} from "$lib/components/data-model/user-account/user-account.server";

/** @type {import('./$types').PageServerLoad} */
export const load = async (event) => {
    event.locals.auth.isAdmin();

    const { params } = event;

    let form;
    if (params?.id.toLowerCase() === "new") {
        form = await superValidate(event, zod(userAccountCreateSchema));
        const relationshipData = await getUserAccountRelationshipData();
        return { form, ...relationshipData };
    } else {
        form = await superValidate(event, zod(userAccountUpdateSchema));
    }

    const userAccountData = await loadUserAccount(params?.id);

    form.data = { ...userAccountData.userAccount };

    return { form, ...userAccountData };
};

/** @type {import('./$types').Actions} */
export const actions = {
    create: async (event) => {
        event.locals.auth.isAdmin();

        const form = await superValidate(event, zod(userAccountCreateSchema));

        if (!form.valid) return fail(400, { form });
        if (form.data.userRoleId?.length === 0) {
            delete form.data.userRoleId;
        }
        form.data.username = form.data.emailAddress;
        form.data.hashedPassword = "password";
        try {
            await prisma.userAccount.create({ data: form.data });
        } catch (error) {
            console.error(error);
            // https://www.prisma.io/docs/orm/reference/error-reference#p2002
            if (error?.code === "P2002") {
                return setError(form, "emailAddress", "User already exists");
            }

            return fail(400, { form });
        }
    },
    update: async (event) => {
        event.locals.auth.isAdmin();

        const form = await superValidate(event, zod(userAccountUpdateSchema));

        if (!form.valid) return fail(400, { form });

        const result = await updateUserAccount(form.data);
        if (!result) return fail(400, form);

        return { form };
    },
    delete: async (event) => {
        event.locals.auth.isAdmin();

        await prisma.userAccount.delete({ where: { id: event.params?.id } });
    }
};
