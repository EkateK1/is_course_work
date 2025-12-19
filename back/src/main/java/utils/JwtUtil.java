package utils;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.Date;

public class JwtUtil {

    private static final String SECRET = "super-secret-key";
    private static final long EXPIRATION_MS = 24L * 60 * 60 * 1000;

    private static final Algorithm ALG = Algorithm.HMAC256(SECRET);

    public static String generateToken(Long id, String position) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + EXPIRATION_MS);

        return JWT.create()
                .withSubject(String.valueOf(id))
                .withClaim("position", position)
                .withIssuedAt(now)
                .withExpiresAt(exp)
                .sign(ALG);
    }

    public static DecodedJWT verify(String token) {
        return JWT.require(ALG)
                .build()
                .verify(token);
    }

}
