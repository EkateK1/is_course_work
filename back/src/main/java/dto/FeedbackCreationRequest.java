package dto;

import lombok.*;
import model.enums.TableNumber;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCreationRequest {
    public TableNumber tableNumber;
    public Short rating;
    public String comment;
    public BigDecimal tipAmount;
}
