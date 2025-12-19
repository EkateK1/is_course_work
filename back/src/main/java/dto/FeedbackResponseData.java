package dto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import model.entities.Comment;
import model.entities.JournalLog;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponseData {

    Long id;
    String time;
    JournalLogResponseData journalLog;
    Short rating;
    String comment;
    BigDecimal tipAmount;
}
