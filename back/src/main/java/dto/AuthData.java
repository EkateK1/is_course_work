package dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AuthData {
    public Long id;
    public String code;

    public AuthData(Long id, String code) {
        this.id = id;
        this.code = code;
    }
}
