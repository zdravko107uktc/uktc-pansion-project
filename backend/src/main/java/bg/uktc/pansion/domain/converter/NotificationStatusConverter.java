package bg.uktc.pansion.domain.converter;

import bg.uktc.pansion.domain.enums.NotificationStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class NotificationStatusConverter implements AttributeConverter<NotificationStatus, String> {

    @Override
    public String convertToDatabaseColumn(NotificationStatus attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public NotificationStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : NotificationStatus.fromValue(dbData);
    }
}
