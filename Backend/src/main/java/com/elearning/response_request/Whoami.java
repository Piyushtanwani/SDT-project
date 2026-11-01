package com.elearning.response_request;

/**
 * What a verified token says about its caller.
 *
 * A front end that decides "is this an admin?" from whatever it wrote into sessionStorage at
 * sign-in is asking the browser to grade its own permissions; this is the answer it should read
 * instead, taken from the account the server signed the token for.
 */
public record Whoami(Long id, String username, String role) {
}
