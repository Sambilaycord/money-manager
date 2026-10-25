// Plain (not a client module) so server code that parses URLs and the client
// controls that write them can both import it.

/** The URL parameter every paginated list uses for its 1-based page number. */
export const LIST_PAGE_PARAM = "page";

/** The URL parameter every searchable list uses for its search text. */
export const LIST_SEARCH_PARAM = "q";
