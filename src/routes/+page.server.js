import { goto } from "$app/navigation";
import { DEFAULT_ROUTE } from "$env/static/private";
import { redirect } from "@sveltejs/kit";

/** @type {import('./$types').PageServerLoad} */
export const load = async (event) => {
    if (DEFAULT_ROUTE) {
        redirect(301, DEFAULT_ROUTE);
    }
};
