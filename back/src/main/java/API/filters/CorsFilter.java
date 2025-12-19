package API.filters;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
@Priority(Priorities.HEADER_DECORATOR)
@jakarta.ws.rs.ApplicationPath("/is_coursework/api")
public class CorsFilter implements ContainerRequestFilter, ContainerResponseFilter {

    private static final String ALLOW_METHODS = "GET,POST,PUT,DELETE,OPTIONS";

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(requestContext.getMethod())) {
            String origin = requestContext.getHeaderString("Origin");
            String reqHeaders = requestContext.getHeaderString("Access-Control-Request-Headers");

            Response.ResponseBuilder rb = Response.ok()
                    .header("Vary", "Origin")
                    .header("Access-Control-Allow-Methods", ALLOW_METHODS)
                    .header("Access-Control-Max-Age", "3600");

            if (origin != null && !origin.isBlank()) {
                rb.header("Access-Control-Allow-Origin", origin)
                        .header("Access-Control-Allow-Credentials", "true");
            } else {
                rb.header("Access-Control-Allow-Origin", "*");
            }

            if (reqHeaders != null && !reqHeaders.isBlank()) {
                rb.header("Access-Control-Allow-Headers", reqHeaders);
            } else {
                rb.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
            }

            requestContext.abortWith(rb.build());
        }
    }

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) throws IOException {
        String origin = requestContext.getHeaderString("Origin");
        responseContext.getHeaders().putSingle("Vary", "Origin");
        if (origin != null && !origin.isBlank()) {
            responseContext.getHeaders().putSingle("Access-Control-Allow-Origin", origin);
            responseContext.getHeaders().putSingle("Access-Control-Allow-Credentials", "true");
        } else {
            responseContext.getHeaders().putSingle("Access-Control-Allow-Origin", "*");
        }
        responseContext.getHeaders().putSingle("Access-Control-Expose-Headers", "Location, X-Total-Count");
    }
}

