package API.filters;

import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import jakarta.ws.rs.ext.Provider;
import lombok.Getter;
import utils.JwtUtil;

import java.io.IOException;
import java.security.Principal;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class JwtAuthFilter implements ContainerRequestFilter {

    @Override
    public void filter(ContainerRequestContext ctx) throws IOException {
        String path = ctx.getUriInfo().getPath();

        if (path.contains("feedback") || path.contains("auth/login")) {
            return;
        }

        String authHeader = ctx.getHeaderString("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            abort(ctx, "Missing or invalid Authorization header");
            return;
        }

        String token = authHeader.substring("Bearer ".length());

        try {
            DecodedJWT jwt = JwtUtil.verify(token);

            Long employeeId = Long.valueOf(jwt.getSubject());
            String position = jwt.getClaim("position").asString();

            SecurityContext original = ctx.getSecurityContext();
            ctx.setSecurityContext(new EmployeeSecurityContext(
                    employeeId,
                    position,
                    original.isSecure()
            ));

        } catch (Exception e) {
            e.printStackTrace();
            abort(ctx, "Invalid or expired token");
        }
    }

    private void abort(ContainerRequestContext ctx, String message) {
        ctx.abortWith(Response.status(Response.Status.UNAUTHORIZED).entity(message).build());
    }

    public static class EmployeeSecurityContext implements SecurityContext {

        @Getter
        private final Long employeeId;
        @Getter
        private final String position;
        private final boolean secure;

        public EmployeeSecurityContext(Long employeeId, String position, boolean secure) {
            this.employeeId = employeeId;
            this.position = position;
            this.secure = secure;
        }

        @Override
        public Principal getUserPrincipal() {
            return () -> String.valueOf(employeeId);
        }

        @Override
        public boolean isUserInRole(String r) {
            return this.position.equals(r);
        }

        @Override
        public boolean isSecure() {
            return secure;
        }

        @Override
        public String getAuthenticationScheme() {
            return "Bearer";
        }
    }
}
