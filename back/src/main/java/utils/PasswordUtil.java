package utils;

import org.mindrot.jbcrypt.BCrypt;

public class PasswordUtil {

    public static String hash(String rawPassword) {
        String salt = BCrypt.gensalt(10);
        return BCrypt.hashpw(rawPassword, salt);
    }

    public static boolean check(String rawPassword, String hashed) {
        return BCrypt.checkpw(rawPassword, hashed);
    }
}

