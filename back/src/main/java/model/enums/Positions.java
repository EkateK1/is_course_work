package model.enums;

import lombok.Getter;

@Getter
public enum Positions {
    waiter("waiter"),
    cook("cook"),
    barman("barman"),
    admin("admin");

    private final String value;

    Positions(String value) {
        this.value = value;
    }

    public static Positions fromString(String text) {
        for (Positions p : Positions.values()) {
            if (p.value.equalsIgnoreCase(text)) {
                return p;
            }
        }
        throw new IllegalArgumentException("Unknown position: " + text);
    }
}
