package mappers;

import dto.FeedbackResponseData;
import dto.JournalLogResponseData;
import model.entities.Comment;
import model.entities.Feedback;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public class FeedbackMapper {

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static FeedbackResponseData toDto(Feedback f) {
        if (f == null) {
            return null;
        }

        FeedbackResponseData dto = new FeedbackResponseData();
        dto.setId(f.getId());
        dto.setTime(formatTime(f.getTime()));
        JournalLogResponseData jlDto = JournalLogMapper.toDto(f.getJournalLog());
        dto.setJournalLog(jlDto);
        dto.setRating(f.getRating());
        Comment comment = f.getComment();
        if (comment != null) {
            dto.setComment(comment.getBody());
        } else {
            dto.setComment(null);
        }
        dto.setTipAmount(f.getTipAmount());
        return dto;
    }

    private static String formatTime(OffsetDateTime time) {
        if (time == null) {
            return null;
        }
        return time.toLocalDateTime().format(TIME_FORMATTER);
    }
}

