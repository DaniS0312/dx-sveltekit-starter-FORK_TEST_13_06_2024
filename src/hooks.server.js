import { DEFAULT_ROUTE } from "$constants/constants";
import { AuthorisationManager, authenticateUser } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
    event.locals.user = await authenticateUser(event);
    event.locals.auth = new AuthorisationManager(event);

    // If in the (authed) route group, check sessionId for current user
    if (event.route.id?.includes("/(authed)")) {
        if (!event.locals.user) {
            throw redirect(303, "/login?session-expired=true");
        }
    }

    // If in (anonymous) route group AND a session is provided, check for current user and if set - navigate to landing page
    if (event.route.id?.includes("/(anonymous)") && event.cookies.get("sessionId")) {
        if (event.locals.user) {
            throw redirect(303, DEFAULT_ROUTE);
        }
    }

    const response = await resolve(event);
    // DX-NOTE: Can mutate the response for all requests here
    return response;
};

/** @type {import('@sveltejs/kit').HandleServerError} */
export async function handleError({ error, event, status, message }) {
    console.log("error", error);
    // console.log("event", event);
    console.log("status", status);
    console.log("message", message);
    return { message };
}
