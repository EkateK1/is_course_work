package model.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "feedback")
@Getter
@Setter
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime time;

    @ManyToOne
    @JoinColumn(name = "id_journal_log", nullable = false)
    private JournalLog journalLog;

    @Column(nullable = false)
    private Short rating;

    @ManyToOne
    @JoinColumn(name = "id_comment")
    private Comment comment;

    @Column(name = "tip_amount")
    private BigDecimal tipAmount;
}
