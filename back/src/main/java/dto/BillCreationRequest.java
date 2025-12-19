package dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import model.enums.TableNumber;

@Getter
@Setter
public class BillCreationRequest {

    @NotNull(message = "Номер стола необходим")
    private TableNumber tableNumber;

    @NotNull(message = "Должен быть минимум 1 гость")
    @Min(value = 1, message = "Должен быть минимум 1 гость")
    private Short guestNumber;


    private Boolean birthday;


    public boolean isBirthday() {
        return Boolean.TRUE.equals(birthday);
    }
}
